Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmPayBill

    Sub FillColleges()
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmPayBill_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcc1.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc1 From Accounts", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcc1.Items.Add(rdr.Item(0))
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

        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombBank.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc2 From Accounts Where Acc1=N'حسابات النقدية'", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombBank.Items.Add(rdr.Item(0))
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
        FillColleges()
    End Sub

    Private Sub CombAcc1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc2.SelectedIndexChanged
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcc3.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc3 From Accounts Where Acc1=N'" & Me.CombAcc1.SelectedItem & "' and Acc2=N'" & _
                                      Me.CombAcc2.SelectedItem & "' and Acc3 Is Not Null", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcc3.Items.Add(rdr.Item(0))
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

    Sub Clear()
        Me.CombAcc2.SelectedIndex = -1
        Me.CombCollege.SelectedIndex = -1
        Me.txtDescr.Clear()
        Me.txtAmount.Clear()
        Me.txtWrittenAmount.Clear()
        Me.CombBank.SelectedIndex = -1
        Me.txtCheqNo.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.CombAcc2.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombAcc2, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcc3.Items.Count <> 0 And Me.CombAcc3.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombAcc3, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombCollege.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombCollege, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtDescr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtDescr, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtWrittenAmount.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAmount, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombBank.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBank, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtCheqNo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtCheqNo, "الرجاء مراجعة البيانات")
            Exit Sub
        End If
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim BillSNo As Integer = GetPaySNo()
            Dim SNo As Integer = GetMoveNo()

            Dim cmd As New SqlCommand("Insert Into Transactions (MoveNo,TransType,SNo,College,Descr," & _
                                      "Writting,TotalValueOut,Acc1,Acc2,Acc3,CurrentUser,ChNo) " & _
                                      "Values (" & SNo & ",N'سند دفع'," & BillSNo & ",N'" & Me.CombCollege.Text & "',N'" & _
                                      Me.txtDescr.Text.Trim & "',N'" & Me.txtWrittenAmount.Text & "'," & _
                                      Me.txtAmount.Text.Trim & ",N'" & Me.CombAcc1.SelectedItem & "',N'" & Me.CombAcc2.SelectedItem & _
                                      "',N'" & Me.CombAcc3.SelectedItem & "',N'" & CurrentUser & "',N'" & _
                                      Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "')", cnn)

            Dim cmd1 As New SqlCommand("Insert Into Transactions (MoveNo,Descr," & _
                                       "Writting,TotalValueIn,Acc1,Acc2,CurrentUser,ChNo) " & _
                                       "Values (" & SNo & ",N'" & Me.txtDescr.Text & "',N'" & _
                                       Me.txtWrittenAmount.Text.Trim & "'," & Me.txtAmount.Text.Trim & _
                                       ",N'حسابات النقدية',N'" & Me.CombBank.SelectedItem & "',N'" & CurrentUser & "',N'" & _
                                       Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "')", cnn)


            cnn.Open()
            cmd.ExecuteNonQuery()
            cmd1.ExecuteNonQuery()
            cnn.Close()

            MsgBox("تم الحفظ")

            PrintBill("سند دفع", SNo, BillSNo)
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

    Private Sub GtxtMoneyValue_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmount.TextChanged
        Try
            Me.txtWrittenAmount.Text = ChangeTo(Me.txtAmount.Text)
            Me.txtWrittenAmount.Text = Me.txtWrittenAmount.Text.Replace(")", "")
            Me.txtWrittenAmount.Text = Me.txtWrittenAmount.Text.Replace("(", "")
        Catch
            Me.txtWrittenAmount.Clear()
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub CombBank_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombBank.SelectedIndexChanged
        If Me.CombBank.SelectedIndex = -1 Then
            Me.txtCheqNo.Clear()
        ElseIf Me.CombBank.SelectedItem = "الخزينة" Then
            Me.txtCheqNo.Text = "-"
        End If
    End Sub

    Private Sub CombAcc1_SelectedIndexChanged_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc1.SelectedIndexChanged
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcc2.Items.Clear()
            Me.CombAcc3.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct Acc2 From Accounts Where Acc1=N'" & Me.CombAcc1.SelectedItem & _
                                      "' and Acc2 Is Not Null", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcc2.Items.Add(rdr.Item(0))
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
End Class