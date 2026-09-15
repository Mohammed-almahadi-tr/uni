Imports System.Data.SqlClient

Public Class frmStdRegUpdate

    Sub FillStatus()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombStatus.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Status From Status", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombStatus.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Sub Clear()
        Me.txtName.Clear()
        Me.CombCollege.SelectedIndex = -1
        Me.CombBatch.SelectedIndex = -1
        Me.txtTele.Clear()
        Me.CombStatus.SelectedIndex = -1
        Me.txtAddress.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtSNo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtSNo, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombCollege.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombCollege, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombBatch.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBatch, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTele.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTele, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtAddress.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAddress, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("update StdFinancial set stdName=N'" & Me.txtName.Text & "',college=N'" & Me.CombCollege.SelectedItem & _
                                      "',Batch=N'" & Me.CombBatch.SelectedItem & "',Tele=N'" & Me.txtTele.Text & _
                                      "',Address=N'" & Me.txtAddress.Text & "',Status=N'" & Me.CombStatus.SelectedItem & "' Where StdID=" & Me.txtSNo.Text, cnn)
            Dim cmd1 As New SqlCommand("update Transactions set StudName=N'" & Me.txtName.Text & _
                                       "' Where StudID=" & Me.txtSNo.Text, cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cmd1.ExecuteNonQuery()
            cnn.Close()

            MsgBox("تم الحفظ")
            Clear()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub loadstudent(ByVal StdID As Integer)
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select stdName,college,Batch,Tele,Address,IsNull(Status,'') Status  From StdFinancial Where StdID=" & Me.txtSNo.Text, cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.txtName.Text = Reader.Item("StdName")
                Me.CombCollege.Text = Reader.Item("College")
                Me.CombBatch.Text = Reader.Item("Batch")
                Me.txtTele.Text = Reader.Item("Tele")
                Me.txtAddress.Text = Reader.Item("Address")
                Me.CombStatus.Text = Reader.Item("Status")
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub txtSNo_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtSNo.KeyUp
        Try
            If e.KeyCode = Keys.Enter Then
                loadstudent(Me.txtSNo.Text)
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""
        Dim a As New frmSearchStdID
        a.ShowDialog()
        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtSNo.Text = SelStudID
        loadstudent(CInt(SelStudID))
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub Button1_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
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

    Private Sub frmStdRegUpdate_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillBatches()
        FillColleges()
        FillStatus()
    End Sub

    Private Sub txtSNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtSNo.TextChanged
        Clear()
    End Sub

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDept.Click
        Try
            Dim Str As String = InputBox("الرجاء إدخال البيان")

            If Trim(Str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Status (Status) Values(N'" & Str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillStatus()
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
End Class