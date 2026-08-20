Imports System.Data.SqlClient
Public Class frmCollegesFees

    Sub Clear()
        Me.CombCollege.SelectedIndex = -1
        Me.CombBatch.SelectedIndex = -1
        Me.txtTusionFees.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            If ValidateInput() = False Then
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim cmd As New SqlCommand("Insert into CollegeFees (College,Batch,TuitionFees,RegFees)" & _
                                              "Values(N'" & Me.CombCollege.SelectedItem & "',N'" & _
                                              Me.CombBatch.SelectedItem & "'," & Me.txtTusionFees.Text & "," & Me.txtRegFees.Text & ")", cnn)
                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    MsgBox("تم الحفظ")

                    Me.CombBatch.SelectedIndex = -1
                    Me.txtTusionFees.Clear()
                    Me.txtRegFees.Clear()

                    FillCollegeFees()
                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.Message)
                End Try
            Else
                MsgBox("الرجاء المسح قبل الإدخال")
                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try

    End Sub

    Function ValidateInput() As Boolean
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim X As Boolean
            Dim cmd As New SqlCommand("Select Count(*) From CollegeFees Where College= N'" & _
                                      Me.CombCollege.SelectedItem & "' and Batch= N'" & Me.CombBatch.SelectedItem & "'", cnn)

            cnn.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            cnn.Close()
            Me.Cursor = Cursors.Default

            Return X
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
            Return False
        End Try
    End Function


    Sub FillCollegeFees()
        Try
            If Me.CombCollege.SelectedIndex = -1 Then
                Me.ListView1.Items.Clear()
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Me.ListView1.Items.Clear()
                Dim cmd As New SqlCommand("Select Distinct SNo,College,Batch,TuitionFees,RegFees From CollegeFees Where College=N'" & _
                                          Me.CombCollege.SelectedItem & "'", cnn)
                Dim Reader As SqlDataReader

                cnn.Open()
                Reader = cmd.ExecuteReader
                While Reader.Read
                    With Me.ListView1.Items.Add(Reader.Item(0))
                        .SubItems.Add(Reader.Item(1))
                        .SubItems.Add(Reader.Item(2))
                        .SubItems.Add(Reader.Item(3))
                        .SubItems.Add(Reader.Item(4))
                    End With
                End While
                cnn.Close()
                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillColleges()
        Try
            Me.CombCollege.Items.Clear()
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillBatches()
        Try
            Me.CombBatch.Items.Clear()
            Dim BatchList As New ArrayList
            BatchList = GetBatchesList()

            For Each BatchName As String In BatchList
                Me.CombBatch.Items.Add(BatchName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmCollegesFees_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillColleges()
        FillBatches()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Try
            Dim str As String
            str = InputBox("الرجاء إدخال إسم الكلية")

            If Trim(str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Colleges (College) Values(N'" & str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()
                FillColleges()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDept.Click
        Try
            Dim str As String
            str = InputBox("الرجاء إدخال إسم الدفعة")

            If Trim(str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Batches (BatchName) Values(N'" & str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()
                FillBatches()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub CombCollege_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombCollege.SelectedIndexChanged
        FillCollegeFees()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.ListView1.SelectedItems.Count = 0 Then
            Exit Sub
        ElseIf MsgBox("تأكيد الحذف؟") = MsgBoxResult.No Then
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Delete From CollegeFees Where SNo = " & _
                                          Me.ListView1.SelectedItems.Item(0).Text, cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillCollegeFees()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.Message)
            End Try
        End If
    End Sub
End Class