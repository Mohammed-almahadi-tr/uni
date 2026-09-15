Imports System.Data.SqlClient

Public Class frmLogin

    Private Sub txtFulNam_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtSNo.KeyUp
        If Me.txtSNo.Text.Trim.Length = 0 Then
            Exit Sub
        Else
            If e.KeyCode = Keys.Enter Then
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim cmd As New SqlCommand("Select UserName From Users Where SNo=" & Me.txtSNo.Text, cnn)
                    cnn.Open()
                    Me.txtUserName.Text = CStr(cmd.ExecuteScalar)
                    cnn.Close()
                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default

                End Try
            End If
        End If
    End Sub

    Private Sub txtSNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtSNo.TextChanged
        Me.txtUserName.Clear()
        Me.LblError.Text = ""
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        End
    End Sub

    Sub Login()
        Try
            If Me.txtUserName.Text.Trim.Length = 0 OrElse Me.txtPass.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim Pass As String
            Dim B As Boolean = False

            Dim cmd As New SqlCommand("Select PWD,Priv From Users Where UserName=N'" & Me.txtUserName.Text & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Pass = CStr(Reader.Item(0))
                If Pass = CStr(Me.txtPass.Text) Then
                    CurrentUser = Me.txtUserName.Text
                    PWD = Pass
                    Priv = Reader.Item(1)
                    Me.Cursor = Cursors.Default
                    Reader.Close()
                    cnn.Close()
                    fMain.Show()
                    B = True
                    Exit While
                Else
                    Me.LblError.Text = "الرجاء مراجعة إسم المستخدم وكلمة السر"
                End If
            End While
            cnn.Close()

            If B = True Then
                Me.Close()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Login()
    End Sub

    Private Sub txtPass_KeyUp(ByVal sender As System.Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtPass.KeyUp
        If e.KeyCode = Keys.Enter Then
            Login()
        End If
    End Sub

    Private Sub txtUserName_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUserName.TextChanged
        Me.LblError.Text = ""
    End Sub

    Private Sub txtPass_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtPass.TextChanged
        Me.LblError.Text = ""
    End Sub

    Private Sub frmLogin_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.LblError.Text = ""
    End Sub

    Private Sub LblError_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles LblError.Click

    End Sub
End Class