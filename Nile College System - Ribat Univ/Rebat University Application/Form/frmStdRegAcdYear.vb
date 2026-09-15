Imports System.Data.SqlClient

Public Class frmStdRegAcdYear

    Sub Clear()
        Me.txtStudID.Clear()
        Me.txtDiscountPerc.Clear()
        Me.txtDiscDescr.Clear()
        Me.txtFixedFees.Clear()
    End Sub

    Sub FillStudReg()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.ListView1.Items.Clear()
            Dim cmd As New SqlCommand("Select TransNo,AcdYear,TuitionFees,RegFees,IsNull(DiscPerc,''),IsNull(DiscDescr,'') " & _
                                      "From Transactions Where StudID=" & _
                                      Me.txtStudID.Text & " and Descr=N'تسجيل للعام الدراسي'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .SubItems.Add(Reader.Item(3))
                    .SubItems.Add(Reader.Item(4))
                    .SubItems.Add(Reader.Item(5))
                End With
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

    Private Sub txtStudID_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStudID.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
            FillStudReg()
        End If
    End Sub

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StdName,College,Batch " & _
                                      "From StdFinancial Where StdID=" & CStr(Me.txtStudID.Text), cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStudName.Text = reader.Item("StdName")
                Me.txtCollege.Text = reader.Item("College")
                Me.txtBatch.Text = reader.Item("Batch")
            End While
            cnn.Close()

            FillFees()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillFees()
        Try
            If Me.txtCollege.Text.Trim.Length = 0 OrElse Me.txtBatch.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Dim cmd As New SqlCommand("Select TuitionFees,RegFees " & _
                                     "From CollegeFees Where College=N'" & Me.txtCollege.Text & _
                                     "' and Batch=N'" & Me.txtBatch.Text & "'", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtFixedFees.Text = reader.Item("TuitionFees")
                Me.txtRegFees.Text = reader.Item("RegFees")
                Me.txtDiscountPerc.Text = 0
            End While
            cnn.Close()
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStudID.TextChanged
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.txtFixedFees.Clear()
        Me.txtRegFees.Clear()
        Me.txtTuitionFees.Clear()
        Me.txtDiscountPerc.Clear()
        Me.ListView1.Items.Clear()
        Me.CombAcdYear.SelectedIndex = -1
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If Me.ListView1.SelectedItems.Count = 0 Then
            Exit Sub
        ElseIf MsgBox("تأكيد الحذف؟") = MsgBoxResult.No Then
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Delete From Transactions Where TransNo = " & _
                                          Me.ListView1.SelectedItems.Item(0).Text, cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillStudReg()
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

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStudName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStudName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTuitionFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTuitionFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtRegFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcdYear.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor

            If ValReg() = True Then
                Me.Cursor = Cursors.Default
                Exit Sub
            End If

            Dim cmd As New SqlCommand("Insert Into Transactions (Descr,StudID,StudName,College,Batch,AcdYear" & _
                                       ",TuitionFees,RegFees,DiscPerc,DiscDescr,TotalValueOut,CurrentUser) " & _
                                     "Values (N'تسجيل للعام الدراسي'," & Me.txtStudID.Text.Trim & ",N'" & _
                                     Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                     "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.CombAcdYear.SelectedItem & _
                                     "'," & Me.txtTuitionFees.Text.Trim & "," & Me.txtRegFees.Text.Trim & _
                                     ",N'" & Me.txtDiscountPerc.Text & " %',N'" & Me.txtDiscDescr.Text & "'," & _
                                     CDbl(CDbl(Me.txtTuitionFees.Text.Trim) + CDbl(Me.txtRegFees.Text.Trim)) & _
                                     ",N'" & CurrentUser & "')", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            MsgBox("تم الحفظ")

            FillStudReg()

            Me.txtRegFees.Clear()
            Me.txtTuitionFees.Clear()
            Me.txtDiscountPerc.Clear()
            Me.CombAcdYear.SelectedIndex = -1
            Me.txtDiscDescr.Clear()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Function ValReg() As Boolean
        Try
            Dim cmd As New SqlCommand("Select Count(*) From Transactions Where Descr=N'تسجيل للعام الدراسي' " & _
                                      " and AcdYear=" & Me.CombAcdYear.SelectedItem & " and StudID=" & Me.txtStudID.Text, cnn1)
            Dim X As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            cnn1.Close()

            If X = True Then
                MsgBox("الطالب مسجل لهذا العام من قبل")
                Return True
            End If

            Return False
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Private Sub btnDept_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnDept.Click
        Try
            Dim Str As String = InputBox("الرجاء إدخال رمز العام")

            If Trim(Str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into AcdYear (AcdYear) Values(N'" & Str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAcdYear()
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

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From AcdYear", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
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

    Private Sub frmStdRegAcdYear_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAcdYear()
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStudID.Text = SelStudID
        FillStudDetails()
        FillStudReg()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub txtDiscountPerc_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtDiscountPerc.TextChanged
        Try
            If Me.txtFixedFees.Text.Trim.Length = 0 Then
                Me.txtTuitionFees.Clear()
                Exit Sub
            ElseIf Me.txtDiscountPerc.Text.Trim.Length = 0 Then
                Me.txtTuitionFees.Clear()
                Exit Sub
            ElseIf Me.txtDiscountPerc.Text = 100 Then
                Me.txtTuitionFees.Text = Me.txtFixedFees.Text
                Exit Sub
            ElseIf Me.txtDiscountPerc.Text = 0 Then
                Me.txtTuitionFees.Text = "0" 'Me.txtFixedFees.Text
            Else
                Try
                    Dim Fees, Discount, DiscoutValue As Double
                    Fees = CDbl(Me.txtFixedFees.Text)
                    Discount = CDbl(Me.txtDiscountPerc.Text)
                    DiscoutValue = Discount * Fees / 100

                    Me.txtTuitionFees.Text = DiscoutValue
                Catch ex As Exception
                    Me.txtTuitionFees.Clear()
                    Me.txtDiscountPerc.Clear()
                End Try
            End If

        Catch ex As Exception

        End Try
    End Sub
End Class